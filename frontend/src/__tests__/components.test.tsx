import { render, screen } from "@testing-library/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

describe("Button component", () => {
  it("should render with default variant", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button")).toHaveTextContent("Click me");
  });

  it("should render with reddit variant", () => {
    render(<Button variant="reddit">Submit</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveTextContent("Submit");
    expect(button).toHaveClass("bg-reddit");
  });

  it("should render with outline variant", () => {
    render(<Button variant="outline">Cancel</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("border");
  });

  it("should render disabled state", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("should render different sizes", () => {
    render(<Button size="sm">Small</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-9");
  });
});

describe("Badge component", () => {
  it("should render with default variant", () => {
    render(<Badge>Default</Badge>);
    expect(screen.getByText("Default")).toBeInTheDocument();
  });

  it("should render with success variant", () => {
    render(<Badge variant="success">Success</Badge>);
    expect(screen.getByText("Success")).toHaveClass("bg-green-500");
  });

  it("should render with destructive variant", () => {
    render(<Badge variant="destructive">Error</Badge>);
    expect(screen.getByText("Error")).toHaveClass("bg-destructive");
  });

  it("should render with warning variant", () => {
    render(<Badge variant="warning">Warning</Badge>);
    expect(screen.getByText("Warning")).toHaveClass("bg-yellow-500");
  });
});

describe("Card component", () => {
  it("should render card with all subcomponents", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
          <CardDescription>Test Description</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Card content here</p>
        </CardContent>
      </Card>,
    );

    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Test Description")).toBeInTheDocument();
    expect(screen.getByText("Card content here")).toBeInTheDocument();
  });

  it("should apply custom className to Card", () => {
    render(
      <Card className="custom-class" data-testid="card">
        Content
      </Card>,
    );
    expect(screen.getByTestId("card")).toHaveClass("custom-class");
  });
});

describe("Input component", () => {
  it("should render input element", () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument();
  });

  it("should render with type password", () => {
    render(<Input type="password" placeholder="Password" />);
    expect(screen.getByPlaceholderText("Password")).toHaveAttribute(
      "type",
      "password",
    );
  });

  it("should render disabled state", () => {
    render(<Input disabled placeholder="Disabled" />);
    expect(screen.getByPlaceholderText("Disabled")).toBeDisabled();
  });
});

describe("Label component", () => {
  it("should render label with text", () => {
    render(<Label>Username</Label>);
    expect(screen.getByText("Username")).toBeInTheDocument();
  });

  it("should associate with form element via htmlFor", () => {
    render(
      <>
        <Label htmlFor="username">Username</Label>
        <Input id="username" />
      </>,
    );
    const label = screen.getByText("Username");
    expect(label).toHaveAttribute("for", "username");
  });
});
